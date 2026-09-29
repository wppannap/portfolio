SELECT f1.fno,
       f2.fno,
       (f1.fare + f2.fare) * 0.9,
       (f2.time_arrive - f1.time_depart) * 24
FROM   Flights f1
JOIN   Flights f2 ON f1.dest_city = f2.src_city
WHERE  f1.src_city = :1
  AND  f2.dest_city = :2
  AND  f2.time_depart > f1.time_arrive
  AND  f1.seats_left > 0
  AND  f2.seats_left > 0