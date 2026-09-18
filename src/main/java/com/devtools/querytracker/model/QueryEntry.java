package com.devtools.querytracker.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

@Getter
@Builder
@Jacksonized
public class QueryEntry {
    private final String sql;
    private final long durationMs;
    private final long executedAt;
    private final String tableName;
    private final String operationType;
    private final String label;
    @JsonProperty("duplicate")
    private final boolean isDuplicate;
    private final int duplicateCount;
}
