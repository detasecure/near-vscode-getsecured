import * as vscode from 'vscode';
import { APP_NAME, contractAccountForNetwork } from '../config';
import { KeyPair } from 'near-api-js';
import { addToContext, getFromContext } from '../extension';
import axios from 'axios';

export const scanCode = async (context: vscode.ExtensionContext, localWorkspace: string) => {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;

    const accountId = await getFromContext(localWorkspace, 'accountId') || "";
    // vscode.window.showInformationMessage("Account ID - " + accountId);

    if(!accountId?.length) {
        vscode.window.showErrorMessage('No logged-in account found.');
        return;
    }


    if (editor) {

        // Get the document text
        const document = editor.document;
        const sourceCode = document.getText();

        // Get the document relative file path
        const filePath = getFilePath(accountId, document.fileName);
        // vscode.window.showInformationMessage("FILE NAME - " + filePath);

        // Show loading message while scanning
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning " + filePath,
            cancellable: false
        }, async (progress) => {
            try {
                const serverURL = await getFromContext(localWorkspace, 'GETSecuredURL') || "http://localhost:8080/scan_code";
                // vscode.window.showInformationMessage("serverURL - " + serverURL);
                const response = await axios.post(serverURL, {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    source_code: sourceCode,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    file_name: filePath,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    account_id: accountId
                });

                
                // Display the response in a new window
                const panel = vscode.window.createWebviewPanel(
                    'scanResult',
                    'Scan Result V1',
                    vscode.ViewColumn.Two,
                    {}
                );

                const panel2 = vscode.window.createWebviewPanel(
                    'scanResult',
                    'Scan Result V2',
                    vscode.ViewColumn.Two,
                    {}
                );

                let findingsTable = generateReportHTML(response.data.findings);
                let findingsTable2 = generateReportHTMLVersion2(response.data.findings);

                panel.webview.html = findingsTable;
                panel2.webview.html = findingsTable2;

            } catch (error) {
                vscode.window.showErrorMessage(`Error scanning code: ${error}`);
            }
        });
    } else {
        vscode.window.showErrorMessage('Click on the source code window and put the cursor to start the scan.');
    }
};

function getFilePath(accountId: string, fileName: string): string {
    const index = fileName.indexOf(accountId);
    if (index !== -1) {
        const pathAfterAccountId = fileName.substring(index + accountId.length);
        return pathAfterAccountId;
        // const pathParts = pathAfterAccountId.split('/');
        // return pathParts[pathParts.length - 1];
    }
    return '';
}

function generateReportHTML(findings: any) {

    // Check for the specific condition
    if (findings.length === 1 && findings[0].issueDescription === "No issue found!") {
        return `<h1>${findings[0].issueDescription}</h1>`;
    }


    let findingsTable = `
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 25px 0;
                        font-size: 10px;
                        text-align: left;
                    }
                    th, td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                    }
                    // th {
                    //     background-color: #f2f2f2;
                    // }
                    tr:hover {
                        background-color: grey;
                    }
                    .priority {
                        color: white;
                    }
                    .priority .low {
                        color: #2c8c2c;
                    }
                    .priority .medium {
                        color: #ffa500;
                    }
                    .priority .WARNING {
                        color: #ffa500;
                    }
                    .priority .high {
                        color: #ff4500;
                    }
                    .priority .critical {
                        color: #ff0000;
                    }
                    .priority .informational {
                        color: #1e90ff;
                    }
                </style>
                <table>
                    <thead>
                        <tr>
                            <th>Issue Description</th>
                            <th>Priority</th>
                            <th>CWE</th>
                            <th>Line Numbers</th>
                            <th>Vulnerable Code Lines</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

  for (let finding of findings) {
    findingsTable += `
                    <tr>
                        <td>${finding.issueDescription}</td>
                        <td class="priority"><span class="${finding.issuePriority}">${finding.issuePriority}</span></td>
                        <td>${finding.CWE}</td>
                        <td>${finding.lineNumbers}</td>
                        <td>${finding.vulnerableCodeLines}</td>
                    </tr>
                `;
  }

  findingsTable += `
                    </tbody>
                </table>
            `;

  return findingsTable;
}

function generateReportHTMLVersion2(findings: any) {

    // Check for the specific condition
    if (findings.length === 1 && findings[0].issueDescription === "No issue found!") {
        return `<h1>${findings[0].issueDescription}</h1>`;
    }
    

    // Generate styled HTML for findings
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const findingsHtml = findings.map((finding: { fileName: any; issueDescription: any; issuePriority: any; CWE: any, lineNumbers: any[]; vulnerableCodeLines: any; }) => {
        return `
            <div class="finding">
                <p class="description">${finding.issueDescription}</p>
                <p class="priority">Priority: <span class="${finding.issuePriority}">${finding.issuePriority}</span></p>
                <p class="description">CWE: ${finding.CWE}</p>
                <p class="lines">Line Numbers: ${finding.lineNumbers}</p>
                <p class="recommendations">Affected Lines: ${finding.vulnerableCodeLines}</p>
            </div>
        `;
    }).join('');

    var findingsTable = `
                <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                            }
                            .finding {
                                border: 1px solid #ccc;
                                padding: 10px;
                                margin-bottom: 20px;
                                border-radius: 5px;
                            }
                            .summary {
                                color: white;
                                font-weight: bold;
                            }
                            .description {
                                color: white;
                            }
                            .priority {
                                color: white;
                            }

                            .priority .low {
                                color: #2c8c2c; /* Green */
                                font-weight: bold;
                            }

                            .priority .medium {
                                color: #ffa500; /* Orange */
                                font-weight: bold;
                            }

                            .priority .WARNING {
                                color: #ffa500; /* Orange */
                                font-weight: bold;
                            }

                            .priority .high {
                                color: #ff4500; /* Red-Orange */
                                font-weight: bold;
                            }

                            .priority .critical {
                                color: #ff0000; /* Red */
                                font-weight: bold;
                            }

                            .priority .informational {
                                color: #1e90ff; /* Dodger Blue */
                                font-weight: bold;
                            }                            
                            .lines, .recommendations {
                                color: white;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Scan Result</h1>
                        ${findingsHtml}
                    </body>
                </html>
            `;

    return findingsTable;
}

