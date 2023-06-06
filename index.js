const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');

const BRANCH = {
    MASTER: 'master',
    RELEASE: 'release',
    STAGING: 'staging',
    DEVELOP: 'develop',
}
const AUTO_DOWN_LABEL = 'auto-down';
const AUTO_UP_LABEL = 'auto-up';

const octokit = new Octokit({auth: core.getInput('GITHUB_TOKEN')});
async function execute()
{
    try {
        const headBranch = github.context.payload.pull_request.head.ref;
        const targetBranch = github.context.payload.pull_request.base.ref;
        const title = github.context.payload.pull_request.title;

        const downStreamPromise = autoCreatePRsToDownStreamBranches(title, headBranch, targetBranch);
        const upStreamPromise = autoCreatePRsToUpStreamBranches(title, headBranch, targetBranch);
        await Promise.all([downStreamPromise, upStreamPromise]);
    } catch (error) {
        core.setFailed(error.message);
    }
}

async function autoCreatePRsToDownStreamBranches(prTitle, headBranch, targetBranch) {
    let prNumber1;
    let prNumber2;
    if (targetBranch === BRANCH.MASTER || targetBranch.indexOf(BRANCH.RELEASE) !== -1) {
        console.log('Create downstream PR to staging & develop');
        prNumber1 = await autoCreatePR(prTitle, headBranch, BRANCH.STAGING, AUTO_DOWN_LABEL);
        prNumber2 = await autoCreatePR(prTitle, headBranch, BRANCH.DEVELOP, AUTO_DOWN_LABEL);
    } else if (targetBranch === BRANCH.STAGING) {
        console.log('Create downstream PR to develop');
        prNumber1 = await autoCreatePR(prTitle, headBranch, BRANCH.DEVELOP, AUTO_DOWN_LABEL);
    }

    //auto merge downstream PR
    if (prNumber1) {
        await autoMergePR(prNumber1);
    }
    if (prNumber2) {
        await autoMergePR(prNumber2);
    }

    return;
}

function autoCreatePRsToUpStreamBranches(prTitle, headBranch, targetBranch) {
    const labels = github.context.payload.pull_request.labels;
    if (labels.some(label => label.name === AUTO_DOWN_LABEL)) {
        console.log('Do not create PR');
        return;
    }

    if (targetBranch === BRANCH.DEVELOP) {
        console.log('Create upstream PR to staging');
        return autoCreatePR(prTitle, headBranch, BRANCH.STAGING, AUTO_UP_LABEL);
    }
}
function autoCreatePR(prTitle, headBranch, baseBranch, autoLabel) {
    return new Promise((resolve, reject) => {
        octokit.repos.compareCommits({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            base: baseBranch,
            head: headBranch,
        }).then(comparison => {
            if (comparison.data.files.length > 0) {
                console.log('There are files that have changed between the base branch and the specified branch.');
                comparison.data.files.forEach(file => console.log(file.filename));
                octokit.pulls.create({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    title: prTitle,
                    head: headBranch,
                    base: baseBranch,
                    body: 'Auto created',
                }).then((response) => {
                    const pr = response.data;
                    octokit.issues.addLabels({
                        owner: github.context.repo.owner,
                        repo: github.context.repo.repo,
                        issue_number: pr.number,
                        labels: [autoLabel, baseBranch],
                    }).then();
                    console.log(`PR #${pr.number} is created`);
                    resolve(pr.number);
                }).catch(error => reject(error));
            } else {
                console.log('Nothing changed.')
                resolve(null);
            }
        }).catch(error => reject(error));
    });
}

function autoMergePR(prNumber) {
    return new Promise((resolve, reject) => {
        octokit.pulls.merge({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
            merge: 'merge'
        }).then(response => {
            console.log(`PR #${prNumber} is merged`)
            resolve();
        }).catch(error => {
           console.log(error);
           resolve();
        });
    });
}

execute().then();
