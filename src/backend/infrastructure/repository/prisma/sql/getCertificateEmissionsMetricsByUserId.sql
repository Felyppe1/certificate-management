SELECT
    COALESCE(SUM(certificates_generated_count), 0)::int AS certificates_total,
    COALESCE(SUM(emails_sent_count), 0)::int AS emails_total,
    JSON_AGG(
        JSON_BUILD_OBJECT('date', date, 'quantity', certificates_generated_count)
        ORDER BY date ASC
    ) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND certificates_generated_count > 0) AS daily_certificates,
    JSON_AGG(
        JSON_BUILD_OBJECT('date', date, 'quantity', emails_sent_count)
        ORDER BY date ASC
    ) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND emails_sent_count > 0) AS daily_emails
FROM daily_usages
WHERE user_id = $1
