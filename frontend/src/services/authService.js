import api from "../api/api"


const authService = {
    login: async (email, password) => {
        const params = new URLSearchParams()
        params.append("username", email)
        params.append("password", password)

        const response = await api.post("/auth/login", params, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })

        if (response.data.access_token) {
            localStorage.setItem("token", response.data.access_token)   
        }

        return response.data
    },

    changePassword: async (newPassword) => {
        const response = await api.post("/account/change-password", {
            new_password: newPassword
        })
        return response.data
    },

    logout: () => {
        localStorage.removeItem("token")
    }
}


export default authService