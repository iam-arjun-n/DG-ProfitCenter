srv.on("downloadTemplate", async (req) => {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.join(
    __dirname,
    "../resources/MassUpload_Template.xlsx"
  );

  const buffer = fs.readFileSync(filePath);

  req._.res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  req._.res.setHeader(
    "Content-Disposition",
    "attachment; filename=MassUpload_Template.xlsx"
  );

  return buffer;
});
