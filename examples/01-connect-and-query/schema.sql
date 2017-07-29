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
	),

    ('Test Email 3',
	 'me-is-3@example.com',
	 'Content for three!',
	 0
	),

    ('Verify your email',
	 'company@example.com',
	 'Click the link http://example.com/verify to verify your email address',
	 0
	),

    ('Inheritance',
	 'more_scam@example.com',
	 'A relative died, here is some inheritance.

      Just pay us a "transfer" fee :)',
	  1
	 );
