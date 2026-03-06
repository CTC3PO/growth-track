export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("authToken");
                // Force reload or redirect to login. Left as simple reload for now per monolithic structure behavior
                window.location.reload();
            }
        }
        throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
}
