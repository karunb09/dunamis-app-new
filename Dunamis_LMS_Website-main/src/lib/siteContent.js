import api from "@/lib/axios";

export const fetchPublicSiteContent = async (type) => {
  const response = await api.get("/v1/siteContent/public", {
    params: type ? { type } : {},
  });

  return Array.isArray(response.data?.data) ? response.data.data : [];
};
