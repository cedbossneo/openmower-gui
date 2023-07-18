import {Api} from "../api/Api.ts";

export const useApi = () => {
    const api = new Api();
    api.baseUrl = "/api"
    return api;
}