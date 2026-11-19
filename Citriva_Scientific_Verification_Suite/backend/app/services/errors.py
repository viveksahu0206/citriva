"""Domain exceptions with user-presentable messages."""


class PipelineError(Exception):
    """An expected failure whose message is safe to show to the end user."""
