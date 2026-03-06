import { fetchWithAuth } from "@/shared/api/client";

export const authApi = {
    login: async (email: string, password: string) => {
        // In a real app this would POST to /api/auth/login or similar, but the monolithic app
        // used a simplified mock flow, so we replicate the payload structure here based on 
        // standard FastAPI OAuth2 Password Bearer implementation.

        // For FastAPI OAuth2, it typically expects form data, not JSON.
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch("http://localhost:8080/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            throw new Error("Invalid credentials");
        }

        const data = await response.json();
        return {
            token: data.access_token,
            user: { id: "1", name: email.split("@")[0], email } // Mock user as FastApi token route usually just returns the token
        };
    },

    getCurrentUser: async () => {
        // Mocking user fetch based on token for now, as the python backend doesn't seem to have a /me endpoint in the old app.js
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Not authenticated");
        return { id: "1", name: "Chau", email: "chau@example.com" };
    }
};
