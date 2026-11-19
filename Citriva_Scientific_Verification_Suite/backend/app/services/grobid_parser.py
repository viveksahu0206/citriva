"""GROBID (TEI-XML) parsing: bibliography table + citing sentences with context windows."""

import logging
import re

import httpx
from lxml import etree

from app.core.config import get_settings
from app.models.schemas import BibEntry, CitationInstance, ParsedDocument
from app.services.http_utils import retry_transient
from app.services.text_utils import normalize_doi, normalize_whitespace, parse_year

logger = logging.getLogger("citriva.grobid")

TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0"}
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
CONTEXT_RADIUS = 2


class GrobidError(Exception):
    pass


@retry_transient
def _request_grobid(base_url: str, pdf_bytes: bytes, read_timeout: float) -> bytes:
    timeout = httpx.Timeout(connect=5.0, read=read_timeout, write=60.0, pool=5.0)
    with httpx.Client(timeout=timeout) as client:
        response = client.post(
            f"{base_url}/api/processFulltextDocument",
            files={"input": ("paper.pdf", pdf_bytes, "application/pdf")},
            data={
                "consolidateCitations": "1",
                "segmentSentences": "1",
                "includeRawCitations": "1",
            },
        )
        response.raise_for_status()
        return response.content


def _text(element: etree._Element) -> str:
    return normalize_whitespace(
        etree.tostring(element, method="text", encoding="unicode", with_tail=False)
    )


def _first_text(node: etree._Element, xpath: str) -> str | None:
    for found in node.xpath(xpath, namespaces=TEI_NS):
        value = _text(found)
        if value:
            return value
    return None


def _parse_authors(bibl: etree._Element) -> list[str]:
    persons = bibl.xpath("./tei:analytic/tei:author/tei:persName", namespaces=TEI_NS)
    if not persons:
        persons = bibl.xpath("./tei:monogr/tei:author/tei:persName", namespaces=TEI_NS)
    authors: list[str] = []
    for person in persons:
        forenames = [_text(f) for f in person.xpath("./tei:forename", namespaces=TEI_NS)]
        surname = _first_text(person, "./tei:surname") or ""
        name = normalize_whitespace(" ".join([*forenames, surname]))
        if name:
            authors.append(name)
    return authors


def _parse_year(bibl: etree._Element) -> int | None:
    for date in bibl.xpath(".//tei:monogr/tei:imprint/tei:date", namespaces=TEI_NS):
        year = parse_year(date.get("when")) or parse_year(_text(date))
        if year:
            return year
    for date in bibl.xpath(".//tei:date", namespaces=TEI_NS):
        year = parse_year(date.get("when")) or parse_year(_text(date))
        if year:
            return year
    return None


def _parse_bibliography(root: etree._Element) -> dict[str, BibEntry]:
    bibliography: dict[str, BibEntry] = {}
    for bibl in root.xpath(".//tei:listBibl/tei:biblStruct", namespaces=TEI_NS):
        bib_id = bibl.get(XML_ID)
        if not bib_id:
            continue
        analytic_title = _first_text(bibl, "./tei:analytic/tei:title")
        monogr_title = _first_text(bibl, "./tei:monogr/tei:title")
        title = analytic_title or monogr_title
        venue = monogr_title if analytic_title else None
        doi = None
        for idno in bibl.xpath(".//tei:idno[@type='DOI' or @type='doi']", namespaces=TEI_NS):
            doi = normalize_doi(_text(idno))
            if doi:
                break
        bibliography[bib_id] = BibEntry(
            bib_id=bib_id,
            title=title,
            authors=_parse_authors(bibl),
            year=_parse_year(bibl),
            doi=doi,
            venue=venue,
            raw_reference=_first_text(bibl, "./tei:note[@type='raw_reference']"),
        )
    return bibliography


def _sentence_elements(root: etree._Element) -> list[etree._Element]:
    elements: list[etree._Element] = []
    for paragraph in root.xpath(".//tei:text/tei:body//tei:p", namespaces=TEI_NS):
        sentences = paragraph.xpath("./tei:s", namespaces=TEI_NS)
        elements.extend(sentences if sentences else [paragraph])
    return elements


def _ref_targets(sentence: etree._Element) -> list[str]:
    """Ordered, de-duplicated bibliography ids cited in a sentence (handles '#b1 #b2')."""
    targets: list[str] = []
    for ref in sentence.xpath(".//tei:ref[@type='bibr']", namespaces=TEI_NS):
        for token in (ref.get("target") or "").split():
            bib_id = token.lstrip("#")
            if bib_id and bib_id not in targets:
                targets.append(bib_id)
    return targets


def parse_tei(xml_bytes: bytes) -> ParsedDocument:
    parser = etree.XMLParser(resolve_entities=False, no_network=True, recover=True)
    try:
        root = etree.fromstring(xml_bytes, parser)
    except etree.XMLSyntaxError as exc:
        raise GrobidError(f"GROBID returned invalid XML: {exc}") from exc
    if root is None:
        raise GrobidError("GROBID returned unparseable TEI-XML")

    title = _first_text(root, "./tei:teiHeader/tei:fileDesc/tei:titleStmt/tei:title")
    bibliography = _parse_bibliography(root)

    elements = _sentence_elements(root)
    texts = [_text(element) for element in elements]

    citations: list[CitationInstance] = []
    for index, element in enumerate(elements):
        claim_text = texts[index]
        if not claim_text:
            continue
        window = " ".join(
            t for t in texts[max(0, index - CONTEXT_RADIUS) : index + CONTEXT_RADIUS + 1] if t
        )
        for bib_id in _ref_targets(element):
            bib = bibliography.get(bib_id)
            if bib is None:
                logger.debug("Dangling bibliographic reference %s ignored", bib_id)
                continue
            citations.append(
                CitationInstance(
                    citation_id=f"c{len(citations) + 1}",
                    claim_text=claim_text,
                    context_window=window,
                    target_bib=bib,
                )
            )

    return ParsedDocument(
        title=title,
        parser="grobid",
        bibliography=bibliography,
        citations=citations,
    )


def parse_with_grobid(pdf_bytes: bytes) -> ParsedDocument:
    settings = get_settings()
    if not settings.grobid_url:
        raise GrobidError("GROBID_URL is not configured")
    xml_bytes = _request_grobid(settings.grobid_url, pdf_bytes, settings.grobid_read_timeout_seconds)
    if not xml_bytes or not xml_bytes.strip():
        raise GrobidError("GROBID returned an empty response")
    return parse_tei(xml_bytes)
