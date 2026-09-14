package com.devtools.querytracker.config;

import com.devtools.querytracker.analyzer.TraceAnalyzer;
import com.devtools.querytracker.filter.RequestTraceFilter;
import com.devtools.querytracker.listener.P6SpyQueryListener;
import com.devtools.querytracker.storage.TraceStorage;
import com.p6spy.engine.event.JdbcEventListener;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ConditionalOnWebApplication
@ComponentScan(basePackages = "com.devtools.querytracker")
public class QueryTrackerAutoConfiguration {

    @Bean
    public FilterRegistrationBean<RequestTraceFilter> requestTraceFilter(
            TraceStorage traceStorage,
            TraceAnalyzer traceAnalyzer) {

        FilterRegistrationBean<RequestTraceFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new RequestTraceFilter(traceStorage, traceAnalyzer));
        bean.addUrlPatterns("/*");
        bean.setOrder(1);
        return bean;
    }

    // Registers listener as Spring bean - datasource-decorator picks up all JdbcEventListener beans automatically
    @Bean
    @ConditionalOnClass(JdbcEventListener.class)
    public P6SpyQueryListener p6SpyQueryListener() {
        return new P6SpyQueryListener();
    }
}
