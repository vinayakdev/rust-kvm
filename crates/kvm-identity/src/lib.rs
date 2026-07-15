mod words;

use anyhow::{Context, Result};
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Identity {
    pub name: String,
}

fn config_path() -> Result<PathBuf> {
    let base = dirs_config_dir().context("could not determine config dir")?;
    Ok(base.join("rust-kvm").join("identity.toml"))
}

fn dirs_config_dir() -> Option<PathBuf> {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        if !xdg.is_empty() {
            return Some(PathBuf::from(xdg));
        }
    }
    let home = std::env::var("HOME").ok()?;
    if cfg!(target_os = "macos") {
        Some(PathBuf::from(home).join("Library/Application Support"))
    } else {
        Some(PathBuf::from(home).join(".config"))
    }
}

pub fn generate_name() -> String {
    let mut rng = rand::thread_rng();
    let adj = words::ADJECTIVES.choose(&mut rng).unwrap();
    let noun = words::NOUNS.choose(&mut rng).unwrap();
    format!("{adj}-{noun}")
}

pub fn load_or_create() -> Result<Identity> {
    let path = config_path()?;
    if path.exists() {
        let raw = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let identity: Identity = toml::from_str(&raw)
            .with_context(|| format!("parsing {}", path.display()))?;
        Ok(identity)
    } else {
        let identity = Identity {
            name: generate_name(),
        };
        save(&identity)?;
        Ok(identity)
    }
}

pub fn save(identity: &Identity) -> Result<()> {
    let path = config_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("creating {}", parent.display()))?;
    }
    let raw = toml::to_string_pretty(identity)?;
    std::fs::write(&path, raw).with_context(|| format!("writing {}", path.display()))?;
    Ok(())
}

pub fn rename(new_name: &str) -> Result<Identity> {
    let identity = Identity {
        name: new_name.trim().to_string(),
    };
    save(&identity)?;
    Ok(identity)
}

pub fn local_ipv4s() -> Result<Vec<IpAddr>> {
    let ifaces = if_addrs::get_if_addrs().context("listing network interfaces")?;
    Ok(ifaces
        .into_iter()
        .filter(|i| !i.is_loopback())
        .map(|i| i.ip())
        .filter(|ip| ip.is_ipv4())
        .collect())
}

/// Other IPv4 hosts seen on the local network, read from the OS ARP/neighbor
/// cache (`arp -a`). Only shows machines this host has already talked to on
/// the LAN — not a full active scan.
pub fn network_neighbors() -> Result<Vec<IpAddr>> {
    let output = std::process::Command::new("arp")
        .arg("-a")
        .output()
        .context("running arp -a")?;
    let text = String::from_utf8_lossy(&output.stdout);

    let mut ips: Vec<IpAddr> = text
        .lines()
        .filter_map(|line| {
            let start = line.find('(')?;
            let end = line[start..].find(')')? + start;
            line[start + 1..end].parse::<IpAddr>().ok()
        })
        .filter(|ip| match ip {
            IpAddr::V4(v4) => {
                !v4.is_loopback()
                    && !v4.is_multicast()
                    && !v4.is_broadcast()
                    && !v4.is_link_local()
            }
            IpAddr::V6(_) => false,
        })
        .collect();

    ips.sort();
    ips.dedup();
    Ok(ips)
}
