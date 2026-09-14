package com.devtools.querytracker.listener;

import com.devtools.querytracker.model.QueryEntry;
import com.p6spy.engine.event.JdbcEventListener;
import com.p6spy.engine.common.PreparedStatementInformation;
import com.p6spy.engine.common.StatementInformation;

import java.sql.SQLException;

public class P6SpyQueryListener extends JdbcEventListener {

    // PreparedStatement SELECT (e.g. findAll, findById)
    @Override
    public void onAfterExecuteQuery(PreparedStatementInformation info,
                                    long timeElapsedNanos,
                                    SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    // Statement SELECT (raw SQL)
    @Override
    public void onAfterExecuteQuery(StatementInformation info,
                                    long timeElapsedNanos,
                                    String sql,
                                    SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    // PreparedStatement INSERT/UPDATE/DELETE
    @Override
    public void onAfterExecuteUpdate(PreparedStatementInformation info,
                                     long timeElapsedNanos,
                                     int rowCount,
                                     SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    // Statement INSERT/UPDATE/DELETE
    @Override
    public void onAfterExecuteUpdate(StatementInformation info,
                                     long timeElapsedNanos,
                                     String sql,
                                     int rowCount,
                                     SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    // PreparedStatement generic execute
    @Override
    public void onAfterExecute(PreparedStatementInformation info,
                                long timeElapsedNanos,
                                SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    // Statement generic execute
    @Override
    public void onAfterExecute(StatementInformation info,
                                long timeElapsedNanos,
                                String sql,
                                SQLException e) {
        if (e != null) return;
        record(info, timeElapsedNanos);
    }

    private void record(StatementInformation info, long timeElapsedNanos) {
        String sql = info.getSqlWithValues();
        if (sql == null || sql.isBlank()) return;
        QueryEntry entry = QueryEntry.builder()
                .sql(sql.trim())
                .durationMs(timeElapsedNanos / 1_000_000)
                .executedAt(System.currentTimeMillis())
                .build();
        QueryContext.add(entry);
    }
}
