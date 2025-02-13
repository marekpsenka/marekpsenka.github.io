+++
title = "Error Handling in Rust, Part 1: Basics"
date = 2019-11-27
+++

The approach Rust takes to error handling was one of the features that drew me in when I first
came into contact with the language. Up until then, I worked in C++ and C# and codebases that
used exceptions and I almost couldn't picture a different strategy. I was puzzled
I hadn't seen these methods before. It only later when it struck me that the ideas pushed
by Rust were not completely new, but improved on techniques that had been around for ages in
some languages.

## Simple Example

To give a simple example of how error handling works in Rust, let's consider a structure
representing a coffee machine:

```rust
pub struct CoffeeMachine {
    water_tank_volume: f64,
    available_coffee_beans: f64,
}
```

For this coffee machine an associated function is defined that is used to make espresso.

```rust
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

From the code, it is immediately apparent that the function may or may not yield the desired
product - an instance of a structure called `Espresso`. We see that the return value is
of type `Result<Espresso, String>` indicating that sometimes we may get a `String` as an error
instead. This will happen if the `CoffeeMachine` has less than 25.0 ml of water in the tank, or
if there is less than 7.0 g of beans in the hopper. Notice how the desired `Espresso` value and
the `String` error value are wrapped in `Ok` and `Err` respectively. We will see why in a few.

Elements of how errors can be dealt with by the caller can be seen in the following test
for the `make_espresso` function:

```rust
    #[test]
    fn error_returned_when_making_espresso_without_beans() {
        let machine = CoffeeMachine {
            water_tank_volume: 300.0,
            available_coffee_beans: 2.0,
        };

        let result = machine.make_espresso();
        assert!(result.is_err());
        assert_eq!(result, Err("Not enough coffee beans".to_string()));
    }
```

Notice how the returned value must be checked to determine if it's the desired type or an error.

## Filozofie

Myšlenka vyhradit prostor pro chybové informace v návratové hodnotě není nová

```C
int main(void)
{
    FILE *f = fopen("non_existent", "r");
    if (f == NULL) {
        perror("fopen() failed");
    } else {
        fclose(f);
    }
}
```

```txt
fopen() failed: No such file or directory
```

## Rust nám to usnadňuje

```rust
pub enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

```rust
fn open_nonexistent_file() {
    match std::fs::File::open("non_existent") {
        Ok(file) => drop(file),
        Err(err) => println!("open() failed: {}", err),
    }
}
```

```txt
open() failed: The system cannot find the file specified. (os error 2)
```

## Porovnej

```C
int main(void) {
    FILE *f = fopen("non_existent", "r");
    if (f == NULL) {
        perror("fopen() failed");
    } else {
        fclose(f);
    }
}
```

```rust
fn open_nonexistent_file() {
    match std::fs::File::open("non_existent") {
        Ok(file) => drop(file),
        Err(err) => println!("open() failed: {}", err),
    }
}
```

## Jiná strategie - výjimky v C\# - nejsou vidět

```C#
public static System.IO.FileStream Open (string path, System.IO.FileMode mode);
```

Kde se dozvím jak vypadá chyba? __V dokumentaci__:
> ArgumentNullException
> PathTooLongException
> (...)

Rust je explicitní. Dozvím se to __v kódu__:

```rust
pub fn open<P: AsRef<Path>>(path: P) -> std::Result<T, std::io::Error>;
```

## Vyjímky střílí

```C#
void OpenNonexistentFile() {
    File.Open("non_existent", FileMode.Open);
}

OpenNonexistentFile();

DoSomethingElse();
```

```txt
C:\code\rust-error-handling\_examples_cs>dotnet run
Unhandled exception. System.IO.FileNotFoundException: Could not find file 'non_existent'.
(...)
```

## Porovnej

```C#
void OpenNonexistentFile() {
    try 
    {
        File.Open("non_existent", FileMode.Open);
    }
    catch (Exception e) {
        Console.WriteLine($"{e}");
    }
}
```

```rust
fn open_nonexistent_file() {
    match std::fs::File::open("non_existent") {
        Ok(file) => drop(file),
        Err(err) => println!("open() failed: {}", err),
    }
}
```

## Shrnutí

- Rust nám na zákaznických projektech pomáhá psát spolehlivý kód
- Myšlenka vyhradit prostor pro chybové informace v návratové hodnotě není nová
- Rust nám to usnadňuje standardním typem `Result<T, E>`
- Příklad alternativní strategie jsou výjimky.
- Nejsou ale vidět a střílí - nutná bdělost