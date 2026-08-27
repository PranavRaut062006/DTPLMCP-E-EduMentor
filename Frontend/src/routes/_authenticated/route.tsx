import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const token = localStorage.getItem("teachai_token");
    if (!token) throw redirect({ to: "/auth", search: { mode: "login" } });
    
    // In a production app you'd verify the token via API here. 
    // We'll trust local storage to be present for the routing, 
    // and let the components redirect on 401 if it's invalid.
    return { token };
  },
  component: () => <Outlet />,
});
