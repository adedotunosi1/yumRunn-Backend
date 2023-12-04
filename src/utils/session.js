const sessions = {};

function getSession(sessionId) {
  const session = sessions[sessionId];
  return session && session.valid ? session : null;
}

function invalidateSession(sessionId) {
  const session = sessions[sessionId];

  if (session) {
    sessions[sessionId].valid = false;
  }

  return sessions[sessionId];
}

function createSession(email, name) {
  const sessionId = String(Object.keys(sessions).length + 1);
  const session = { sessionId, email, valid: true };
  sessions[sessionId] = session;
  return session;
}

function getUser(email) {
  // Assuming you have a 'users' array defined somewhere
  // Add the necessary logic to retrieve the 'users' array
  // or replace it with your own user data source.
  return users.find((user) => user.email === email);
}

module.exports = {
  getSession,
  invalidateSession,
  createSession,
  getUser,
};
