const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

async function addLabelToPR(owner, repo, prNumber, label) {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN, // Assumes you have a GitHub token available as an environment variable
    });

    try {
        octokit.pulls.create({
            owner,
            repo,
            title: '[AUTO] abc',
            head: 'test-diff-comm',
            base: 'master',
            body: 'Auto created',
        }).then(pr => { console.log(pr)})
        // await octokit.issues.addLabels({




        //     owner,
        //     repo,
        //     issue_number: prNumber,
        //     labels: [label],
        // });
        console.log(`Label '${label}' added successfully to PR #${prNumber}`);
    } catch (error) {
        console.error(`Error adding label to PR #${prNumber}:`, error);
    }
}

// Usage example
const owner = "minhtrong-bic";
const repo = "test-bic-clickup-automation";
const prNumber = 300;
const label = "autadsffdo";

addLabelToPR(owner, repo, prNumber, label);
