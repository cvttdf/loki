# Loki Shell Integration for Bash
# Uses OSC 133 sequences to mark command boundaries for block output

# Guard against double-loading
[[ -n "$LOKI_SHELL_INTEGRATION" ]] && return
export LOKI_SHELL_INTEGRATION=1

# OSC helper
__loki_osc() {
    printf "\e]133;%s\a" "$1"
}

# Mark prompt start (called before each prompt)
__loki_prompt_command() {
    local exit_code=$?
    # Previous command finished
    __loki_osc "D;$exit_code"
    # New prompt starting
    __loki_osc "A"
}

# Set PROMPT_COMMAND to mark boundaries
if [[ -z "$PROMPT_COMMAND" ]]; then
    PROMPT_COMMAND="__loki_prompt_command"
else
    PROMPT_COMMAND="__loki_prompt_command;$PROMPT_COMMAND"
fi

# Mark command input start via DEBUG trap
__loki_debug_trap() {
    __loki_osc "B"
}
trap '__loki_debug_trap' DEBUG

# Initial prompt mark
__loki_osc "A"
