import * as github from "@actions/github";
import * as semver from "semver";

import { GITHUB_TOKEN } from "./constants";

export function isSemverStyle(semverVersion: string): boolean {
  const result = semver.validRange(semverVersion, { loose: true });
  if (
    result === null ||
    semverVersion.includes("+") ||
    semverVersion.includes("~")
  ) {
    return false;
  } else {
    return true;
  }
}

function unique(array: string[]) {
  return Array.from(new Set(array));
}

async function getAllCompilerVersions(): Promise<string[]> {
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const releases = [];
  const state = { continue: true, count: 0 };
  while (state.continue) {
    const response = await octokit.rest.repos.listReleases({
      owner: "ocaml",
      repo: "ocaml",
      per_page: 100,
      page: state.count,
    });
    if (response.data.length > 0) {
      releases.push(...response.data);
      state.count++;
    } else {
      state.continue = false;
    }
  }
  const versions = unique(releases.map(({ tag_name }) => tag_name));
  return versions;
}

export async function resolveVersion(semverVersion: string): Promise<string> {
  const compilerVersions = await getAllCompilerVersions();
  const matchedFullCompilerVersion = semver.maxSatisfying(
    compilerVersions,
    semverVersion,
    { loose: true }
  );
  if (matchedFullCompilerVersion !== null) {
    return matchedFullCompilerVersion;
  } else {
    throw new Error(
      `No OCaml base compiler packages matched the version ${semverVersion} in the opam-repository.`
    );
  }
}
