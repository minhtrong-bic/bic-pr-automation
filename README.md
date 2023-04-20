# Auto create PR to up/down stream branches Github action

This action auto create a PR to the right up/downstream branch of the base branch when a PR is merged and if the head branch has changed file(s) comparing with the up/downstream branch.

The up/downstream branch is determined follow this list
- Upstream (only apply for `develop`)
  - `develop` -> `staging`, if a PR is merged to `develop`, a new PR will be created from head branch to `staging` 
- Downstream
  - `master` or `release*` -> `staging`
  - `staging` -> `develop`
  
## Inputs

### `GITHUB_TOKEN`
*Github secret token.*

**Required**.

## Example workflow file
```yaml
on:
  pull_request:
    types:
      - closed
jobs:
  auto_create_pr:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    name: Auto create PR
    steps:
      - name: Auto create PR to upstream and downstream
        uses: minhtrong-bic/bic-pr-automation@1.0.0
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```