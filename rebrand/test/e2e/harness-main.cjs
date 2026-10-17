// Electron entry used by wizard.e2e.cjs: runs the real first-run provisioner
// (bundle.ts, built to CommonJS) in an unpackaged app.
const { app } = require("electron")

app.setPath("userData", process.env.E2E_USERDATA)
app.on("window-all-closed", () => {})
app.whenReady().then(() => require(process.env.E2E_BUNDLE).startHyperBundle())
