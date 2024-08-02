class StateConfiguration {
  secret: string = "";
  componentId: string = "";

  get secretValue(): string {
    return this.secret;
  }

  set secretValue(value: string) {
    this.secret = value;
  }
}

export const stateConfig = new StateConfiguration()
