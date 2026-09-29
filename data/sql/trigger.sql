CREATE OR REPLACE TRIGGER update_flight_seats
AFTER INSERT ON Booking_Details
FOR EACH ROW
BEGIN
  UPDATE Flights
  SET seats_left = seats_left - 1
  WHERE fno = :NEW.fno;
END;
/