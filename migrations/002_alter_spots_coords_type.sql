-- Change spot coordinates to FLOAT / DECIMAL to support precision
ALTER TABLE spots 
ALTER COLUMN x_coord TYPE DOUBLE PRECISION,
ALTER COLUMN y_coord TYPE DOUBLE PRECISION;
