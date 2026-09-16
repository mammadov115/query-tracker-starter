package com.devtools.querytracker.model;

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
    private final boolean isDuplicate;
    private final int duplicateCount;
}
