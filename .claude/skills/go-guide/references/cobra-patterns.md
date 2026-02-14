# Cobra Command Patterns — CLI

## Overview

The Meridian CLI uses Cobra for command structure and Viper for configuration. Commands follow a consistent pattern.

## Root Command

```go
// cmd/root.go
package cmd

import (
    "fmt"
    "os"

    "github.com/spf13/cobra"
    "github.com/spf13/viper"
)

var cfgFile string

var rootCmd = &cobra.Command{
    Use:   "meridian",
    Short: "Meridian — unified issue tracking across platforms",
    Long:  `Meridian brings together issues from GitHub, JIRA, and local trackers into a single view.`,
}

func Execute() {
    if err := rootCmd.Execute(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func init() {
    cobra.OnInitialize(initConfig)
    rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.meridian.yaml)")
}

func initConfig() {
    if cfgFile != "" {
        viper.SetConfigFile(cfgFile)
    } else {
        home, _ := os.UserHomeDir()
        viper.AddConfigPath(home)
        viper.SetConfigName(".meridian")
    }
    viper.AutomaticEnv()
    viper.ReadInConfig()
}
```

## Subcommand Pattern

```go
// cmd/overview.go
package cmd

import (
    "fmt"

    "github.com/spf13/cobra"
    "github.com/gherrink/meridian/cli/internal/tui/overview"
)

var overviewCmd = &cobra.Command{
    Use:   "overview",
    Short: "Show project overview across all trackers",
    RunE: func(cmd *cobra.Command, args []string) error {
        format, _ := cmd.Flags().GetString("format")

        if format == "json" {
            return runOverviewJSON()
        }
        return overview.Run()
    },
}

func init() {
    rootCmd.AddCommand(overviewCmd)
    overviewCmd.Flags().StringP("format", "f", "tui", "Output format (tui, json)")
}
```

## Conventions

- Each command in its own file in `cmd/`
- Use `RunE` (returns error) instead of `Run`
- Register subcommands in `init()`
- Flags defined in `init()`, read in `RunE`
- Long-running operations show a spinner or progress via Bubbletea
- Errors printed to stderr, normal output to stdout
- Use Viper for configuration that persists across invocations
- Environment variables: `MERIDIAN_` prefix (auto-bound via `viper.AutomaticEnv()`)
