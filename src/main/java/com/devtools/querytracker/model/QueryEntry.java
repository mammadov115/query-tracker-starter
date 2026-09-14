package com.devtools.querytracker.model;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QueryEntry {
    private final String sql;
    private final long durationMs;
    private final long executedAt;
    // parsed from SQL at capture time
    private final String tableName;
    private final String operationType;
    private final boolean isDuplicate;
    private final int duplicateCount;
}
