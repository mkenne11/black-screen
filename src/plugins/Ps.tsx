import * as React from "react";
import {PluginManager} from "../PluginManager";
// import {isEqual} from "lodash";
// import {colors} from "../views/css/colors";
import {CSSObject} from "../views/css/definitions";
import {executeCommand, executeCommandWithShellConfig} from "../PTY";
// import Link from "../utils/Link";
import Button from "./autocompletion_utils/Button";

interface PSProps {
  command: string[];
  processResults: string[][];
};

interface PSState {
  failReason: string | undefined;
  processDetails: string[][];
};

const resultSet = (result: string[]) => {
        const numColumns = result[0].trim().replace(/ +(?= )/g, "").split(" ").length;
        return result.splice(1)
                     .map(i => i.trim().replace(/ +(?= )/g, "").split(" ", numColumns));
};

const psResult = async (command: string[]) => {
            return resultSet(await executeCommandWithShellConfig(command.join(" ") + " --format='pid'"));
};

interface PSButton {
  buttonText: string;
  action: () => Promise<void>;
}

interface ProcessLineProps {
    processDetail: string[];
    killButton: PSButton;
}

const ProcessLine: React.StatelessComponent<ProcessLineProps> = ({
    processDetail,
    killButton,
}) => {
    const style: CSSObject = {display: "inline-block"};
    // TODO: respect LSCOLORS env var
    style.width = `40px`;
    style.cursor = "pointer";
    style.margin = "2px 4px";
    return <div style={style}> {() => {
                    for (let process of processDetail) {
                        return <span>{process}</span>;
                    }
                }};
                <Button onClick={killButton.action}>{killButton.buttonText}</Button>
            </div>;
};

class PSComponent extends React.Component<PSProps, PSState> {

    constructor(props: PSProps) {
        super(props);
        this.state = {
            failReason: "",
            processDetails: this.props.processResults,
        };
    }

    async reload() {
        const commandResult: string[][] = await psResult(this.props.command);
        this.setState({
            failReason: "",
            processDetails: commandResult,
        });
    }

    render(): any {
        <div style={{ padding: "10px" }}> {
            this.state.processDetails.map((processDetail) => {
                const processID = processDetail[processDetail.length - 1];
                const processAttributes = processDetail.splice(-1, 1);
                let buttonAction = async () => {
                    try {
                        await executeCommand("kill", ["SIGTERM", processID], "");
                        await this.reload();
                    } catch (e) {
                        this.setState({ failReason: "",
                                        processDetails: this.state.processDetails});
                    }
                };
                return <ProcessLine processDetail={processAttributes}
                                    killButton={{buttonText: "killProcess", action: buttonAction}}>
                       </ProcessLine>;
            })
        } </div>;
    }
}

PluginManager.registerCommandInterceptorPlugin({
    intercept: async({
        command,
    }): Promise<React.ReactElement<any>> => {
        const commandResult = await psResult(command);
        return <PSComponent command={command} processResults={commandResult} />;
    },

    isApplicable: ({ command }): boolean => {
        return command[0] === "ps";
    },
});
