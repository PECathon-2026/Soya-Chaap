export interface OperatorUser {
  id: string;
  email: string;
  name: string;
  provider: "email" | "google" | "github";
  role: string;
  createdAt: string;
}

const STORAGE_USERS_KEY = "devpilot_registered_users";
const STORAGE_SESSION_KEY = "devpilot_active_session";

// Pre-seeded default accounts
const DEFAULT_USERS: OperatorUser[] = [
  {
    id: "usr_lead_01",
    email: "operator@devpilot.ai",
    name: "Lead Architect",
    provider: "email",
    role: "System Operator",
    createdAt: new Date().toISOString(),
  },
];

export const authStorage = {
  // Get all registered users from internal localStorage
  getUsers(): OperatorUser[] {
    if (typeof window === "undefined") return DEFAULT_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_USERS;
    }
  },

  // Save a new user to internal storage
  saveUser(user: OperatorUser) {
    if (typeof window === "undefined") return;
    const users = this.getUsers();
    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  },

  // Get active session
  getSession(): OperatorUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Set active session
  setSession(user: OperatorUser) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
  },

  // Clear session
  clearSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  // Internal Sign In
  signIn(email: string): OperatorUser {
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create user automatically on internal storage
      const name = email.split("@")[0] || "Operator";
      user = {
        id: `usr_${Date.now()}`,
        email,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        provider: "email",
        role: "System Operator",
        createdAt: new Date().toISOString(),
      };
      this.saveUser(user);
    }

    this.setSession(user);
    return user;
  },

  // Internal Sign Up
  signUp(email: string): OperatorUser {
    const name = email.split("@")[0] || "Operator";
    const user: OperatorUser = {
      id: `usr_${Date.now()}`,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      provider: "email",
      role: "System Operator",
      createdAt: new Date().toISOString(),
    };
    this.saveUser(user);
    this.setSession(user);
    return user;
  },

  // Internal Social Login (Google / GitHub)
  socialLogin(provider: "google" | "github"): OperatorUser {
    const defaultEmail = provider === "google" ? "architect@google.dev" : "octocat@github.dev";
    const name = provider === "google" ? "Google Operator" : "GitHub Operator";
    const user: OperatorUser = {
      id: `usr_${provider}_${Date.now()}`,
      email: defaultEmail,
      name,
      provider,
      role: "Lead Architect",
      createdAt: new Date().toISOString(),
    };
    this.saveUser(user);
    this.setSession(user);
    return user;
  },
};
