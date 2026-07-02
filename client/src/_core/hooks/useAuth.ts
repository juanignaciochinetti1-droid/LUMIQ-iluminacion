export function useAuth() {
  return {
    user: { name: "Administrador", email: "", id: 0 } as any,
    loading: false,
    error: null,
    isAuthenticated: true,
    refresh: () => {},
    logout: async () => {},
  };
}
