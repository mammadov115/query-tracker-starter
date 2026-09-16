package com.devtools.querytracker.model;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

import java.util.List;

@Getter
@Builder
@Jacksonized
public class RequestTrace {
    private final String traceId;
    private final String method;
    private final String uri;
    private final int statusCode;
    private final long durationMs;
    private final long timestamp;
    private final int queryCount;
    private final boolean hasNPlusOne;
    private final boolean hasDuplicates;
    private final List<QueryEntry> queries;
}
