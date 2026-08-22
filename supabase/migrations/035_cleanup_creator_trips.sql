-- Rimuove i viaggi creator (modello Trip) e le richieste di join.

DELETE FROM user_notifications
WHERE type IN ('trip_join_request', 'trip_join_accepted', 'trip_join_rejected');

DELETE FROM trips;
