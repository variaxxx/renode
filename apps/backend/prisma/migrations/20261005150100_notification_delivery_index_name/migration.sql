-- Keep the event index name within PostgreSQL's identifier limit.
ALTER INDEX "notification_delivery_server_id_event_type_event_date_interval_"
RENAME TO "notification_delivery_event_key";
