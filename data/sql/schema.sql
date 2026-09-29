CREATE TABLE Customers (
  cust_id     VARCHAR2(10) PRIMARY KEY,
  name        VARCHAR2(100) NOT NULL,
  nationality VARCHAR2(50),
  passport_no VARCHAR2(20) UNIQUE NOT NULL
);

CREATE TABLE Flights (
  fno         VARCHAR2(10) PRIMARY KEY,
  time_depart DATE NOT NULL,
  time_arrive DATE NOT NULL,
  fare        NUMBER(10, 2),
  seats_left  NUMBER(5),
  src_city    VARCHAR2(50),
  dest_city   VARCHAR2(50),
  CONSTRAINT chk_fare  CHECK (fare >= 0),
  CONSTRAINT chk_seats CHECK (seats_left >= 0),
  CONSTRAINT chk_time  CHECK (time_arrive > time_depart)
);

CREATE TABLE Bookings (
  bid         VARCHAR2(10) PRIMARY KEY,
  cust_id     VARCHAR2(10) REFERENCES Customers(cust_id),
  total_price NUMBER(10, 2)
);

CREATE TABLE Booking_Details (
  bid          VARCHAR2(10) REFERENCES Bookings(bid) ON DELETE CASCADE,
  fno          VARCHAR2(10) REFERENCES Flights(fno),
  flight_order NUMBER(1),
  PRIMARY KEY (bid, fno)
);