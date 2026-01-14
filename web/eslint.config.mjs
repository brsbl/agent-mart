import eslintConfigNext from "eslint-config-next";

const eslintConfig = [
  ...eslintConfigNext,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
