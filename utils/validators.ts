export const validateName = (name: string | null = null) => {
  if (!name || name.length === 0) {
    return { message: "Try again with a name.", isValid: false };
  }

  const namePattern = /^[a-zA-Z0-9\s]{3,20}$/;
  if (!namePattern.test(name)) {
    return {
      message: "That name won’t work. Try again (3-15 characters, no symbols).",
      isValid: false,
    };
  }

  return { isValid: true };
};

export const validateUsername = (username: string | null = null) => {
  if (!username || username.length === 0) {
    return { message: "Try again with an username.", isValid: false };
  }

  const namePattern = /^[a-zA-Z0-9_]{4,15}$/;
  if (!namePattern.test(username)) {
    return {
      message: "That username won’t work. Use 4-15 characters: letters, numbers, or underscores.",
      isValid: false,
    };
  }

  return { isValid: true };
};