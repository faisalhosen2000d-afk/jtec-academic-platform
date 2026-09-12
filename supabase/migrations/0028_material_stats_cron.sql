select cron.schedule(
  'aggregate-material-stats-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'material_stats_project_url'
      ) || '/functions/v1/aggregate-material-stats',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'material_stats_cron_service_role'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $job$
);