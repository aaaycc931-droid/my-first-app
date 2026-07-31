import { extname, posix } from "node:path";
import ts from "typescript";

export const forbiddenGeneratedSampleExtensions = new Set([
  ".pdf",
  ".mxl",
  ".omr",
  ".log",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
  ".heic",
  ".xml",
]);

const exactAllowedResourcePaths = new Set([
  "android/app/src/main/AndroidManifest.xml",
  "docs/companion/assets/resonance-traveler-final-head.jpg",
  "mobile/public/icons/app-icon-192.png",
  "mobile/public/icons/app-icon-512.png",
  "mobile/public/icons/app-icon-maskable-512.png",
]);

export const isAllowedTrackedResource = (filePath) =>
  exactAllowedResourcePaths.has(filePath) ||
  filePath.startsWith("android/app/src/main/res/");

export const findForbiddenTrackedFiles = (trackedFiles) =>
  trackedFiles.filter((filePath) => {
    const extension = extname(filePath).toLowerCase();
    return (
      forbiddenGeneratedSampleExtensions.has(extension) &&
      !isAllowedTrackedResource(filePath)
    );
  });

const libSourceFilePattern = /^lib\/.*\.(?:[cm]?[jt]sx?)$/;
const uiSourceRoots = ["app", "components", "mobile/src"];

export const isLibSourceFile = (filePath) => libSourceFilePattern.test(filePath);

const scriptKindForPath = (filePath) => {
  switch (extname(filePath).toLowerCase()) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
};

export const collectModuleSpecifiers = (filePath, source) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath),
  );
  const specifiers = new Set();
  const addStringLiteral = (node) => {
    if (node && ts.isStringLiteralLike(node)) specifiers.add(node.text);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
    ) {
      addStringLiteral(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression)
        && node.expression.text === "require";
      if (isDynamicImport || isRequire) addStringLiteral(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node)
      && ts.isLiteralTypeNode(node.argument)
    ) {
      addStringLiteral(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...specifiers];
};

const resolveRepositoryModulePath = (filePath, specifier) => {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(filePath), specifier));
  }
  if (specifier.startsWith("@/")) return posix.normalize(specifier.slice(2));
  if (uiSourceRoots.some((root) => specifier.startsWith(`${root}/`))) {
    return posix.normalize(specifier);
  }
  return null;
};

export const findLibUiBoundaryViolations = (sourceFiles) =>
  sourceFiles.flatMap(({ filePath, source }) => {
    if (!isLibSourceFile(filePath)) return [];
    return collectModuleSpecifiers(filePath, source).flatMap((specifier) => {
      const resolvedPath = resolveRepositoryModulePath(filePath, specifier);
      if (
        !resolvedPath
        || !uiSourceRoots.some(
          (root) => resolvedPath === root || resolvedPath.startsWith(`${root}/`),
        )
      ) {
        return [];
      }
      return [{ filePath, specifier, resolvedPath }];
    });
  });
