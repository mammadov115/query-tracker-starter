package com.devtools.querytracker.model;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QueryEntry {
    private final String sql;
    private final long durationMs;
    private final long executedAt;
}
