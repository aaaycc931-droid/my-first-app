const audiverisPath = process.env.AUDIVERIS_PATH?.trim() ?? "";
const doesNotExecuteMessage = "this script does not execute Audiveris";

if (!audiverisPath) {
  console.log(JSON.stringify({
    success: false,
    error: "AUDIVERIS_PATH must be set to a non-empty string.",
    message: doesNotExecuteMessage,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    success: true,
    audiverisPath,
    message: doesNotExecuteMessage,
  }, null, 2));
}
