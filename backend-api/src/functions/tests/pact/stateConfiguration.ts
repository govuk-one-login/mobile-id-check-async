import { IAsyncTokenRequestDependencies } from "../../asyncToken/asyncTokenHandler";

class StateConfiguration {
  secret: string = "";
  componentId: string = "";
  dependencies!: IAsyncTokenRequestDependencies;

  get secretValue(): string {
    return this.secret;
  }

  set secretValue(value: string) {
    this.secret = value;
  }

  get dependenciesValue() {
    return this.dependencies;
  }

  set dependenciesValue(value: IAsyncTokenRequestDependencies) {
    this.dependencies = value;
  }
}

export const stateConfig = new StateConfiguration();
