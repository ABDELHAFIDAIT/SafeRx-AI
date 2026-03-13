import api from "../api/api";



const decodeJwt = (token) => {
    try {
        const base64Url = token.split(".")[1];
        const base64    = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

const authService = {

    login: async (email, password) => {
        const params = new URLSearchParams();
        params.append("username", email);
        params.append("password", password);

        const response = await api.post("/auth/login", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        const { access_token, is_first_login, role,
                first_name, last_name } = response.data;

        if (access_token) {
            localStorage.setItem("token", access_token);
            localStorage.setItem("user", JSON.stringify({
                first_name,
                last_name,
                role,
                is_first_login,
            }));
        }

        return response.data;
    },


    getUser: () => {
        try {
            const stored = localStorage.getItem("user");
            if (stored) return JSON.parse(stored);

            const token = localStorage.getItem("token");
            if (!token) return null;
            return decodeJwt(token);
        } catch {
            return null;
        }
    },


    getToken: () => localStorage.getItem("token"),


    isAuthenticated: () => {
        const token = localStorage.getItem("token");
        if (!token) return false;
        const payload = decodeJwt(token);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            authService.logout();
            return false;
        }
        return true;
    },


    changePassword: async (newPassword) => {
        const response = await api.post("/account/change-password", {
            new_password: newPassword,
        });
        const user = authService.getUser();
        if (user) {
            localStorage.setItem("user", JSON.stringify({
                ...user,
                is_first_login: false,
            }));
        }
        return response.data;
    },


    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    },
};


export default authService;