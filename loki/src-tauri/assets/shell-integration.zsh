# Loki Shell Integration for Zsh
# Uses OSC 133 sequences to mark command boundaries for block output

# Guard against double-loading
[[ -n "$LOKI_SHELL_INTEGRATION" ]] && return
export LOKI_SHELL_INTEGRATION=1

# OSC helper
__loki_osc() {
    printf "\e]133;%s\a" "$1"
}

# Mark prompt start
__loki_precmd() {
    local exit_code=$?
    # Previous command finished
    __loki_osc "D;$exit_code"
    # New prompt starting
    __loki_osc "A"
}

# Mark prompt end / command input start
__loki_preexec() {
    __loki_osc "B"
}

# Mark command executed
__loki_postexec() {
    __loki_osc "C"
}

# Register hooks
autoload -Uz add-zsh-hook
add-zsh-hook precmd __loki_precmd
add-zsh-hook preexec __loki_preexec

# Initial prompt mark
__loki_osc "A"
