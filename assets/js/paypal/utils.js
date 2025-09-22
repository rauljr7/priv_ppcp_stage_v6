async function getBrowserSafeClientToken() {
   let base_url = "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-2b157b93-6e85-4f0d-b040-eccd1b257eef/default/ppcp-v6-endpoints";
   let url = base_url + "?method=client_token";

   return fetch(url, {
      method: "GET",
      mode: "cors"
   }).then(function (res) {
      let ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") > -1) {
         return res.json();
      } else {
         return res.text();
      }
   }).then(function (data) {
      return data;
   }).catch(function (err) {
      console.error("client_token error:", err);
      throw err;
   });
}