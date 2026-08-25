const path = require("path");

const LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const LOGO_CID = "dunamis-logo";

const otpTemplate = (otp) => {
	return `<!DOCTYPE html>
	<html>
	
	<head>
		<meta charset="UTF-8">
		<title>OTP Verification Email</title>
		<style>
			body {
				background-color: #fffaf4;
				font-family: Arial, sans-serif;
				font-size: 16px;
				line-height: 1.4;
				color: #333333;
				margin: 0;
				padding: 0;
			}

			.container {
				max-width: 600px;
				margin: 32px auto;
				padding: 32px 24px;
				text-align: center;
				background: #ffffff;
				border-radius: 20px;
				box-shadow: 0 20px 60px -30px rgba(15, 23, 42, 0.35);
			}
	
			.logo {
				max-width: 200px;
				margin-bottom: 20px;
			}
	
			.message {
				font-size: 18px;
				font-weight: bold;
				margin-bottom: 20px;
			}
	
			.body {
				font-size: 16px;
				margin-bottom: 20px;
			}
	
			.cta {
				display: inline-block;
				padding: 10px 20px;
				background-color: #FFD60A;
				color: #000000;
				text-decoration: none;
				border-radius: 5px;
				font-size: 16px;
				font-weight: bold;
				margin-top: 20px;
			}
	
			.support {
				font-size: 14px;
				color: #999999;
				margin-top: 20px;
			}

			.support a {
				color: #CC3700;
			}
	
			.highlight {
				display: inline-block;
				margin: 4px 0 8px;
				padding: 10px 28px;
				background-color: #fff1e8;
				color: #CC3700;
				border-radius: 12px;
				font-size: 28px;
				font-weight: bold;
				letter-spacing: 0.2em;
			}
		</style>
	
	</head>
	
	<body>
		<div class="container">
			<a href="https://dunamisindia.co.in"><img class="logo"
					src="cid:${LOGO_CID}" alt="Dunamis Logo"></a>
			<div class="message">OTP Verification Email</div>
			<div class="body">
				<p>Dear User,</p>
				<p>Thank you for registering with Dunamis. To complete your registration, please use the following OTP
					(One-Time Password) to verify your account:</p>
				<h2 class="highlight">${otp}</h2>
				<p>This OTP is valid for 5 minutes. If you did not request this verification, please disregard this email.
				Once your account is verified, you will have access to our platform and its features.</p>
			</div>
			<div class="support">If you have any questions or need assistance, please feel free to reach out to us at <a
					href="mailto:info@Dunamis.com">info@Dunamis.com</a>. We are here to help!</div>
		</div>
	</body>
	
	</html>`;
	
};

otpTemplate.attachments = [
	{ filename: "Dunamis.png", path: LOGO_PATH, cid: LOGO_CID },
];

module.exports = otpTemplate;