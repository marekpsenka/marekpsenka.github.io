+++
title = "Error Handling in Rust, Part 2: Composability"
date = 2025-06-08
+++

This article presents a second part of my series on Rust error handling that I started
in a [post](@/blog/rust-error-handling-part-one/index.md) three months ago. Now we'll build on that
foundation to explore composability – how to effectively combine and manage errors in more complex
Rust applications

Let's recall the simple example of making espresso in a coffee machine from the first part:

```rust
pub struct CoffeeMachine {
    water_tank_volume: f64,
    available_coffee_beans: f64,
}

impl CoffeeMachine {
    pub fn make_espresso(&self) -> Result<Espresso, String> {
        if self.water_tank_volume < 25.0 {
            Err("Not enough water in tank".to_string())
        } else if self.available_coffee_beans < 7.0 {
            Err("Not enough coffee beans".to_string())
        } else {
            Ok(Espresso {})
        }
    }
}
```

## Composing to Make Breakfast

Composition is a fundamental tool in programming and allows us to solve huge problems by breaking
them up into small puzzles that can be cracked individually. It is hard for any intelligence -
human or artificial - to reason about a complex system by observing all its moving parts. It helps
a great deal to form abstractions and build the solution layer by layer: from the small cogs to
movements and on to the whole clockwork. To show how this abstract framework can be applied to error
handling in Rust, let's consider our coffee machine a part of a larger system designed
to make breakfast:

```rust
pub struct Breakfast {
    pub espresso: Espresso,
    pub toast: Toast,
}

pub fn make_breakfast(coffee_machine: CoffeeMachine) -> Result<Breakfast, String> {
    match coffee_machine.make_espresso() {
        Ok(espresso) => Ok(Breakfast {
            espresso,
            toast: Toast {},
        }),
        Err(coffee_machine_err_str) => Err(format!(
            "The coffee machine failed to make espresso, {}",
            coffee_machine_err_str
        )),
    }
}
```

Here the task of preparing breakfast is explicitly broken down into parts. Just as we want
to compose the whole breakfast out of toast and espresso, we want to compose
the error reported from the `make_breakfast` function from information provided by any of the inner
functions representing individual steps. To do this, we match on the return value of `make_espresso`
and when get a string from the error variant, we form a new string stating what went wrong with
the inner error string appended. This is illustrated by the following diagram

![Composition diagram](./composition.jpg)

This approach allows us to propagate information about causes which is useful if it affects how the
error is handled for example.

## Building Composable Error Types

In the above example we used `String` as the error type and composed it manually like this:

```rust
        Err(coffee_machine_err_str) => Err(format!(
            "The coffee machine failed to make espresso, {}",
            coffee_machine_err_str
        )),
```

Now this would get very tedious in a real world codebase. We only used it to demonstrate the concept
and will now look for better alternatives. What types should we use to propagate error information?
To start our search, let's peek inside the standard library and see if there is any guideline
on defining error types. The first thing we see is the following
[`std::error::Error`](https://doc.rust-lang.org/std/error/trait.Error.html)
trait declaration (I omitted the deprecated methods):

```rust
pub trait Error: Debug + Display {
    fn source(&self) -> Option<&(dyn Error + 'static)> { ... }
    fn provide<'a>(&'a self, request: &mut Request<'a>) { ... }
}
```

The standard library says that this trait defines basic expectations for error values. They
must describe themselves through `Debug` and `Display` traits and may provide cause information
through `Error::source()`. To take a closer look, here is how the function is described
in the documentation:

> `Error::source()` is generally used when errors cross “abstraction boundaries”. If one module must
> report an error that is caused by an error from a lower-level module, it can allow accessing
> that error via `Error::source()`. This makes it possible for the high-level module to provide its
> own errors while also revealing some of the implementation for debugging.

The reason why we digged specifically into this function is because we will discuss the potential
for breaching encapsulation when propagating cause information later in the article. At the
bottom of the documentation page for the `Error` trait, you are going to see that the
trait is implemented for many error types in the standard library:

```txt
impl Error for std::fmt::Error
impl Error for std::io::Error
(...)
```

So should you also define your own error type and implement the `std::error:Error` trait yourself?
Well, there are at least two other options:

1. Use a crate like `thiserror` to auto-implement `std::error:Error`
2. Adopt a general-purpose error type from a crate like `anyhow`

There is no _right strategy_, you should pick what suits your code. Let's now look at the first
option and some specifics of the `thiserror` crate.

## Fanning out with `thiserror`

Pulling in the `thiserror` crate, we can rewrite the `make_espresso` function from our first
example as follows:

```rust
use thiserror::Error;

#[derive(PartialEq, Debug, Error)]
pub enum MakeEspressoError {
    #[error("Not enough water in tank")]
    NotEnoughWater,
    #[error("Not enough coffee beans")]
    NotEnoughBeans,
}

impl CoffeeMachine {
    pub fn make_espresso(&self) -> Result<Espresso, MakeEspressoError> {
        if self.water_tank_volume < 25.0 {
            Err(MakeEspressoError::NotEnoughWater)
        } else if self.available_coffee_beans < 7.0 {
            Err(MakeEspressoError::NotEnoughBeans)
        } else {
            Ok(Espresso {})
        }
    }
}
```

The key feature of [`thiserror`](https://docs.rs/thiserror/latest/thiserror/)
is the `thiserror::Error` derive macro which is commonly applied to enums defining the
possible error variants, but can be applied to structs and other kinds as well. The `error`
[helper attribute](https://doc.rust-lang.org/reference/procedural-macros.html#derive-macro-helper-attributes)
is used to provide accompanying error messages on which the automatic `Display` implementation is based.

To see how composability can be achieved with `thiserror`, we can rewrite the breakfast example like
this:

```rust
#[derive(PartialEq, Debug, Error)]
pub enum MakeBreakfastError {
    #[error("Unable to make espresso, {0}")]
    UnableToMakeEspresso(#[from] MakeEspressoError),
    #[error("Unable to make toast")]
    UnableToMakeToast,
}

pub fn make_breakfast(coffee_machine: CoffeeMachine) -> Result<Breakfast, MakeBreakfastError> {
    Ok(Breakfast {
        espresso: coffee_machine.make_espresso()?,
        toast: Toast {},
    })
}
```

Here we leverage the fact that Rust enum variants can carry data and therefore we can propagate the
source error directly. But in the above example, there is no explicit construction
of the `UnableToMakeEspresso` variant and it still works. But how? Part of the magic is achieved
by the `?` operator acting on the `Result`. Under the hood, it searches for a way to convert
the possible error value from the result into the error value of the function in whose body
it is being used. But `MakeBreakFastError` and `MakeEspressoError` are different types and their
values cannot be converted between by default. That is where the `from` helper attribute comes
into play since it generates a `From<MakeEspressoError> for MakeBreakFastError` implementation. Plus
the formatting in the `"Unable to make espresso, {0}"` string achieves the same composition effect
on the error messages we achieved manually in the first part of this article.

To see how the technique works in practice, consider the following test:

```rust
    #[test]
    fn error_returned_when_making_breakfast_without_beans() {
        let coffee_machine = CoffeeMachine {
            water_tank_volume: 300.0,
            available_coffee_beans: 2.0,
        };

        let result = make_breakfast(coffee_machine);
        assert!(result.is_err());
        assert_eq!(
            result,
            Err(MakeBreakfastError::UnableToMakeEspresso(
                MakeEspressoError::NotEnoughBeans
            ))
        );

        println!("{}", result.unwrap_err());
    }
```

It's execution produces this output:

```txt
Unable to make espresso, Not enough coffee beans
```

There is one important consequence of propagating the source errors by plugging them in
as data or members in the outer error type. If inner type is also public for some reason, it could
be referenced by callers directly as part of their error handling code and this presents a risk
of encapsulation breach. See a [strategy](https://docs.rs/thiserror/latest/thiserror/#details) based
on the `transparent` helper attribute proposed by the `thiserror` crate documentation for an idea
how to deal with this challenge.

## Folding in with `anyhow`

The approach taken by the `anyhow` crate is quite different from `thiserror` and a great deal
simpler. The core of it lies in using `anyhow::Result` in all fallible functions you define
yourself:

```rust
use anyhow::{anyhow, Context, Result};

impl CoffeeMachine {
    pub fn make_espresso(&self) -> Result<Espresso> {
        if self.water_tank_volume < 25.0 {
            Err(anyhow!("Not enough water in tank"))
        } else if self.available_coffee_beans < 7.0 {
            Err(anyhow!("Not enough coffee beans"))
        } else {
            Ok(Espresso {})
        }
    }
}
```

If you are wondering why the `anyhow::Result` has just one type parameter then you have found wherein
lies the simplicity: it is essentially just a typedef to a standard `Result` where the error type
is `anyhow::Error`. The following implementation is associated with `anyhow::Error`:

```rust
impl<E> From<E> for Error
where
    E: core::Error + Send + Sync + 'static,
{
    // (...)
}
```

So any error type satisfying `core::Error + Send + Sync + 'static` can be converted into
`anyhow::Error`. Hopefully it will be better explained with an example of `anyhow` in action
when making breakfast:

```rust
pub fn make_breakfast(coffee_machine: CoffeeMachine) -> Result<Breakfast> {
    let espresso = coffee_machine
        .make_espresso()
        .context("Unable to make espresso")?;

    Ok(Breakfast {
        espresso,
        toast: Toast {},
    })
}
```

Running the test below demonstrates how we achieve the same compositional effect on error
messages with `anyhow::Context`:

```rust
    #[test]
    fn error_returned_when_making_breakfast_without_beans() {
        let coffee_machine = CoffeeMachine {
            water_tank_volume: 300.0,
            available_coffee_beans: 2.0,
        };

        let result = make_breakfast(coffee_machine);
        assert!(result.is_err());

        let err = result.unwrap_err();
        for inner in err.chain() {
            println!("{inner}");
        }
    }
```

```txt
Unable to make espresso
Not enough coffee beans
```

## The different nature of `anyhow` and `thiserror`

The following diagram illustrates the _fold in_ property of `anyhow::Error` which can absorb
information from almost any type implementing `core::Error` and contrasts it with `thiserror`:

![Anyhow vs. thiserror diagram](./anyhow_vs_thiserror.jpg)

As opposed to `anyhow`, `thiserror` has a _fan out_ effect. When applied to an enum type, the
variants can represent different causes of failure of a specific function. The caller can then
choose to act in different ways on the particular errors.

Thanks to its _fold in_ nature, `anyhow` is well suited for use in application code. E.g. in
some core loop of a service or application where a number of functions are executed over and
over. As breaking such loop to execute some specific error handling and recovery routines
is not usually desired on most failures, a possible error chain can be
folded into `anyhow::Error` discarding the majority of the information carried by the source error types.
Then, an `anyhow::Error` returned by any of the loop parts will mostly just be logged and there will
be no specific code trying to figure out the cause.

On the other hand, `thiserror` shines where the caller should be able to easily react
to a particular cause to do some specific error handling.

## Summary

- Think about composability in error types, is it useful to you?
- Use `anyhow` as a quick start
- `anyhow` is mostly suitable for application code
- If caller needs to match on different causes, use `thiserror`
- Use `thiserror` in libraries, but you might also consider defining your own type
