package com.devtools.querytracker.listener;

import com.devtools.querytracker.model.QueryEntry;
import com.p6spy.engine.event.JdbcEventListener;
import com.p6spy.engine.spy.appender.MessageFormattingStrategy;
import com.p6spy.engine.common.StatementInformation;

import java.sql.SQLException;

public class P6SpyQueryListener extends JdbcEventListener implements MessageFormattingStrategy {

    @Override
    public void onAfterAnyExecute(StatementInformation info, long timeElapsedNanos, SQLException e) {
        if (e != null) return;
        String sql = info.getSqlWithValues();
        if (sql == null || sql.isBlank()) return;
        QueryEntry entry = QueryEntry.builder()
                .sql(sql.trim())
                .durationMs(timeElapsedNanos / 1_000_000)
                .executedAt(System.currentTimeMillis())
                .build();
        QueryContext.add(entry);
    }

    @Override
    public String formatMessage(int connectionId, String now, long elapsed,
                                String category, String prepared, String sql, String url) {
        return sql;
    }
}
