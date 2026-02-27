 const sendPasswordTemplate =  (user,role,password) => {
    const{name,email}=user
      return `
      <p>Hello <strong>${name.firstName}</strong>,</p>
      <p>Your <strong>${role}</strong> account has been successfully created in the <strong>LMS system</strong>.</p>
      <p><strong>Here are your login credentials:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary Password:</strong> ${password}</li>
      </ul>
      <p>Please log in using the above credentials and <strong>change your password</strong> immediately after your first login for security purposes.</p>
      <p>👉 <a href="${process.env.BASE_URL}/login">Click here to login</a></p>
      <p>Thank you,<br>Dunamis Team</p>
    `;

};

module.exports = sendPasswordTemplate;