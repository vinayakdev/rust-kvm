use std::io;
use std::net::IpAddr;
use std::time::Duration;

use anyhow::Result;
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen};
use crossterm::{execute, ExecutableCommand};
use ratatui::backend::CrosstermBackend;
use ratatui::layout::{Constraint, Direction, Layout};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Terminal;

enum Mode {
    View,
    Rename(String),
}

struct App {
    name: String,
    ips: Vec<IpAddr>,
    neighbors: Vec<IpAddr>,
    mode: Mode,
    status: Option<String>,
}

fn main() -> Result<()> {
    let identity = kvm_identity::load_or_create()?;
    let ips = kvm_identity::local_ipv4s().unwrap_or_default();
    let neighbors = kvm_identity::network_neighbors().unwrap_or_default();

    let mut app = App {
        name: identity.name,
        ips,
        neighbors,
        mode: Mode::View,
        status: None,
    };

    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let result = run(&mut terminal, &mut app);

    disable_raw_mode()?;
    io::stdout().execute(LeaveAlternateScreen)?;

    result
}

fn run(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>, app: &mut App) -> Result<()> {
    loop {
        terminal.draw(|frame| draw(frame, app))?;

        if event::poll(Duration::from_millis(200))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match &mut app.mode {
                    Mode::View => match key.code {
                        KeyCode::Char('q') => return Ok(()),
                        KeyCode::Char('r') => {
                            app.mode = Mode::Rename(app.name.clone());
                            app.status = None;
                        }
                        _ => {}
                    },
                    Mode::Rename(buf) => match key.code {
                        KeyCode::Enter => {
                            let new_name = buf.trim().to_string();
                            if new_name.is_empty() {
                                app.status = Some("name cannot be empty".to_string());
                            } else {
                                kvm_identity::rename(&new_name)?;
                                app.name = new_name;
                                app.status = Some("saved".to_string());
                                app.mode = Mode::View;
                            }
                        }
                        KeyCode::Esc => {
                            app.mode = Mode::View;
                        }
                        KeyCode::Backspace => {
                            buf.pop();
                        }
                        KeyCode::Char(c) => {
                            buf.push(c);
                        }
                        _ => {}
                    },
                }
            }
        }
    }
}

fn draw(frame: &mut ratatui::Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Length(3),
            Constraint::Length(3 + app.ips.len().max(1) as u16),
            Constraint::Length(3 + app.neighbors.len().max(1) as u16),
            Constraint::Min(1),
        ])
        .split(frame.area());

    let title = Paragraph::new("rust-kvm")
        .style(Style::default().add_modifier(Modifier::BOLD).fg(Color::Cyan))
        .block(Block::default().borders(Borders::ALL));
    frame.render_widget(title, chunks[0]);

    let name_line = match &app.mode {
        Mode::View => Line::from(vec![
            Span::styled("name: ", Style::default().fg(Color::DarkGray)),
            Span::styled(&app.name, Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
        ]),
        Mode::Rename(buf) => Line::from(vec![
            Span::styled("new name: ", Style::default().fg(Color::DarkGray)),
            Span::styled(buf.as_str(), Style::default().fg(Color::Yellow)),
            Span::raw("_"),
        ]),
    };
    let name_block = Paragraph::new(name_line).block(Block::default().borders(Borders::ALL).title("machine name"));
    frame.render_widget(name_block, chunks[1]);

    let ip_lines: Vec<Line> = if app.ips.is_empty() {
        vec![Line::from("no IPv4 address found")]
    } else {
        app.ips
            .iter()
            .map(|ip| Line::from(format!("{ip}")))
            .collect()
    };
    let ip_block = Paragraph::new(ip_lines).block(Block::default().borders(Borders::ALL).title("IPv4 address"));
    frame.render_widget(ip_block, chunks[2]);

    let neighbor_lines: Vec<Line> = if app.neighbors.is_empty() {
        vec![Line::from("none seen yet")]
    } else {
        app.neighbors
            .iter()
            .map(|ip| Line::from(format!("{ip}")))
            .collect()
    };
    let neighbor_block = Paragraph::new(neighbor_lines)
        .block(Block::default().borders(Borders::ALL).title("other devices on network"));
    frame.render_widget(neighbor_block, chunks[3]);

    let help = match &app.mode {
        Mode::View => "r: rename   q: quit".to_string(),
        Mode::Rename(_) => "enter: save   esc: cancel".to_string(),
    };
    let status_line = match &app.status {
        Some(s) => format!("{help}   [{s}]"),
        None => help,
    };
    let footer = Paragraph::new(status_line).style(Style::default().fg(Color::DarkGray));
    frame.render_widget(footer, chunks[4]);
}
