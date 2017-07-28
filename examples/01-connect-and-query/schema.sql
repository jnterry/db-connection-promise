DROP   DATABASE IF EXISTS any_db_q_example_01;
CREATE DATABASE           any_db_q_example_01;

USE any_db_q_example_01;

CREATE TABLE email (
	id      int          NOT NULL AUTO_INCREMENT,
	subject varchar(255) NOT NULL,
	sender  varchar(255) NOT NULL,
	content TEXT         NOT NULL,
	is_spam int(1)       NOT NULL,

    PRIMARY KEY (id)
);

INSERT INTO email (subject, sender, content, is_spam) VALUES
	('Very Important Message',
	 'boss@example.com',
	 'You need to do a thing',
	 0
	),

	('Send me some money',
	 'scammers_r_us@example.com',
	 'Hi person!

      [Insert Generic Sob Story Here]

      Send money to bank account:
      Account Number : xxx
      Sort Code      : yyy

      From Mr Scammer',
	  1
	);
